require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const admin = require('firebase-admin')
const port = process.env.PORT || 3000
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString(
  'utf-8'
)
const serviceAccount = JSON.parse(decoded)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const app = express()
// middleware
app.use(
  cors({
    origin: [process.env.CLIENT_DOMAIN],
    credentials: true,
    optionSuccessStatus: 200,
  })
)
app.use(express.json())

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(' ')[1]
  console.log(token)
  if (!token) return res.status(401).send({ message: 'Unauthorized Access!' })
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.tokenEmail = decoded.email
    console.log(decoded)
    next()
  } catch (err) {
    console.log(err)
    return res.status(401).send({ message: 'Unauthorized Access!', err })
  }
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const db = client.db('plantsDB')
    const plantsCollection = db.collection('plants')
    const ordersCollection = db.collection('orders')
    const usersCollection = db.collection('users')
    const sellerRequestsCollection = db.collection('sellerRequests')



    // save a plant data in db
    app.post('/plants', async (req, res) => {
      const plantData = req.body;
      // console.log(plantData);

      const result = await plantsCollection.insertOne(plantData)
      res.send(result);
    })

    // get all plants from db
    app.get('/plants', async (req, res) => {
      const result = await plantsCollection.find().toArray();
      res.send(result);
    })

    // get a single plant from db
    app.get('/plants/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await plantsCollection.findOne(query);
      res.send(result);
    })

    // ----------------------------------------
    // Payments endpoints
    app.post('/create-checkout-session', async (req, res) => {
      const paymentInfo = req.body;
      console.log(paymentInfo);

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: paymentInfo?.name,
                description: paymentInfo?.description,
                images: [paymentInfo?.image],
              },
              unit_amount: paymentInfo?.price * 100,
            },
            quantity: paymentInfo?.quantity,
          },
        ],
        customer_email: paymentInfo?.customer?.email,
        // extra info
        metadata: {
          plantId: paymentInfo?.plantId,
          customer: paymentInfo?.customer?.email
        },
        mode: 'payment',
        // if payment success
        success_url: `${process.env.CLIENT_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        // if payment cancel
        cancel_url: `${process.env.CLIENT_DOMAIN}/plant/${paymentInfo?.plantId}`
      })

      res.send({
        url: session.url
      })
    })

    // payment-success + session id
    app.post('/payment-success', async (req, res) => {
      const { sessionId } = req.body;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // console.log(session)

      // get plant data from db
      const plant = await plantsCollection.findOne({ _id: new ObjectId(session.metadata.plantId) });

      // check if same transactionId already exist in db or not
      const order = await ordersCollection.findOne({ transactionId: session.payment_intent })

      // ordered plant info to save in db
      if (session.status === 'complete' && plant && !order) {
        const orderInfo = {
          plantId: session.metadata.plantId,
          transactionId: session?.payment_intent,
          customer: session.metadata.customer,
          status: 'pending',
          seller: plant?.seller,
          name: plant?.name,
          image:plant?.image,
          category: plant?.category,
          quantity: 1,
          // price will be from session
          price: session.amount_total / 100
        }
        const result = await ordersCollection.insertOne(orderInfo);
        // reduce/update quantity from the ui quantity(after order is set)
        await plantsCollection.updateOne(
          {
            _id: new ObjectId(session.metadata.plantId)
          },
          {
            $inc: { quantity: -1 }
          }
        )
        return res.send({
          transactionId: session.payment_intent,
          orderId: result.insertedId,
        })
      }
      res.send({
        transactionId: session.payment_intent,
        orderId: result._id,
      })
    })

    // ==========================================================================================
    // My-orders: get all orders of a customer by email
    app.get('/my-orders',verifyJWT,async(req,res)=>{
      // email from middleware
      const email=req.tokenEmail;
      // customer:"user@a.com"
      const query={customer: email};

      const result=await ordersCollection.find(query).toArray();
      res.send(result);
    })

    // Manage-orders: get all orders that a seller gets- by email
    app.get('/manage-orders/:email',async(req,res)=>{
      const email=req.params.email;
      // seller:{email:user@b.com}"
      const query={'seller.email': email};

      const result=await ordersCollection.find(query).toArray();
      res.send(result);
    })

    // My-inventory: get all plants added a seller gets- by email
    app.get('/my-inventory/:email',async(req,res)=>{
      const email=req.params.email;
      // seller:{email:user@b.com}"
      const query={'seller.email': email};

      const result=await plantsCollection.find(query).toArray();
      res.send(result);
    })


    // ...........................................................................
    // Manage-users role: save or update user in db
    app.post('/user',async(req,res)=>{
      const userData=req.body;
      // add some extra info
      userData.created_at=new Date().toISOString();
      userData.last_loggedIn=new Date().toISOString();
      userData.role='customer'

      const query={email:userData?.email};

      //find if the user already exist or not
      const alreadyExists= await usersCollection.findOne(query);
      console.log('user already exist--> ', !!alreadyExists)
      
      // if exist--> update
      if(alreadyExists){
        console.log('updating user info-->')
        const update= {
          $set: {
            last_loggedIn:new Date().toISOString
          }
        }
        const result=await usersCollection.updateOne(query, update)

        return res.send(result)
      }

      // if user does'nt exist -->save 
      console.log('saving user info ....')
      const result=await usersCollection.insertOne(userData);
      res.send(result);
    })

    // useRole hook: get a user's role by email
    app.get('/user/role',verifyJWT, async(req,res)=>{
      // const email=req.params.email;
      const result=await usersCollection.findOne({email: req.tokenEmail})
      res.send({
        role: result?.role
      })
    })

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // become a seller: save seller request:
    app.post('/become-seller',verifyJWT,async(req,res)=>{
      const email= req.tokenEmail;
      // seller already exist ?
      const alreadyExists= await sellerRequestsCollection.findOne({email});
      if(alreadyExists){
        return res.status(409).send({message: "Already requested, please wait!!"})
      }
      const result= await sellerRequestsCollection.insertOne({email})
      res.send(result)
    })

    // Seller request: get all seller request for admin
    app.get ('/seller-requests',verifyJWT,async(req,res)=>{
      const result=await sellerRequestsCollection.find().toArray();
      res.send(result);
    })

    // Manage user: get all user's for admin
    app.get ('/users',verifyJWT,async(req,res)=>{
      // admin email
      const adminEmail=req.tokenEmail;
      // give all user except admin
      const result=await usersCollection.find({email: {$ne:adminEmail}}).toArray();
      res.send(result);
    })

    // SellerRequestsDataRow: update user role by admin
    app.patch('/update-role',verifyJWT,async(req,res)=>{
      const {email,role}= req.body;
      const update={
        $set:{role}
      }
      // update role in the user collection
      const result= await usersCollection.updateOne({email}, update)

      // delete from seller request collection
      await sellerRequestsCollection.deleteOne({email})

      res.send(result)
    })







    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('PlantNet Server is running..')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
