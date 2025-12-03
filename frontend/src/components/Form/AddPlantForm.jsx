import { useForm } from "react-hook-form"
import { imageUpload } from "../../utils";
import useAuth from '../../hooks/useAuth'
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import LoadingSpinner from "../Shared/LoadingSpinner";
import ErrorPage from "../../pages/ErrorPage";
import toast from "react-hot-toast";
import { TbFidgetSpinner } from 'react-icons/tb'

const AddPlantForm = () => {
  // Seller info from user
  const { user } = useAuth()

  // useMutation hook --> Post method
  const {isPending,isError, mutateAsync,reset:mutationReset}=useMutation({
    mutationFn: async(payload)=>{
      // post operation
      await axios.post(`${import.meta.env.VITE_API_URL}/plants`, payload)
    },

    onSuccess: data=>{
      console.log(data);
      // toast
      toast.success("Plant added successfully")

      mutationReset();
      // Query Key
    },

    onError: (error)=>{
      console.log(error)
    },
    
    //execute before mutation function 
    onMutate: payload=>{
      console.log("I will post this data--> ",payload)
    },
    // onSettled:(data,err)=>{
    //    console.log(data);
    //    console.log(err);
    // },
    retry:3
  })

  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  // Form submit
  const onSubmit = async (data) => {
    // data
    const { name, price, quantity, description, image, category } = data;
    const imageFile = image[0];


    // add plant data to db
    try {
      const imageURL = await imageUpload(imageFile);

      // Plants data
      const plantData = {
        name,
        image: imageURL,
        price: Number(price),
        quantity: Number(quantity),
        category,
        description,
        // Seller
        seller: {
          image: user?.photoURL,
          name: user?.displayName,
          email: user?.email
        }
      };

      // call muted function
      await mutateAsync(plantData)

      // reset form
      reset();
    } 
    catch (error) {
      console.log(error)
    }
  }

  // loading
  if(isPending) return <LoadingSpinner></LoadingSpinner>
  // error
  if(isError) return <ErrorPage></ErrorPage>
  return (
    <div className='w-full min-h-[calc(100vh-40px)] flex flex-col justify-center items-center text-gray-800 rounded-xl bg-gray-50'>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-10'>
          <div className='space-y-6'>
            {/* Name */}
            <div className='space-y-1 text-sm'>
              <label htmlFor='name' className='block text-gray-600'>
                Name
              </label>
              <input
                className='w-full px-4 py-3 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white'
                {...register('name', {
                  required: 'Name is required',
                  maxLength: {
                    value: 20,
                    message: "Name must be within 20 character"
                  }
                })}
                id='name'
                type='text'
                placeholder='Plant Name'
              />
              {errors.name && <p className='text-red-600 text-sm'>{errors.name.message}</p>}
            </div>
            {/* Category */}
            <div className='space-y-1 text-sm'>
              <label htmlFor='category' className='block text-gray-600 '>
                Category
              </label>
              <select
                className='w-full px-4 py-3 border-lime-300 focus:outline-lime-500 rounded-md bg-white'
                {...register('category', {
                  required: 'Category is required'
                })}
              >
                <option value='Indoor'>Indoor</option>
                <option value='Outdoor'>Outdoor</option>
                <option value='Succulent'>Succulent</option>
                <option value='Flowering'>Flowering</option>
              </select>
              {errors.category && <p className='text-red-600 text-sm'>{errors.category.message}</p>}
            </div>
            {/* Description */}
            <div className='space-y-1 text-sm'>
              <label htmlFor='description' className='block text-gray-600'>
                Description
              </label>

              <textarea
                id='description'
                placeholder='Write plant description here...'
                className='block rounded-md focus:lime-300 w-full h-32 px-4 py-3 text-gray-800  border border-lime-300 bg-white focus:outline-lime-500 '
                name='description'
                {...register('description', {
                  required: 'Description is required'
                })}
              ></textarea>
              {errors.description && <p className='text-red-600 text-sm'>{errors.description.message}</p>}
            </div>
          </div>
          <div className='space-y-6 flex flex-col'>
            {/* Price & Quantity */}
            <div className='flex justify-between gap-2'>
              {/* Price */}
              <div className='space-y-1 text-sm'>
                <label htmlFor='price' className='block text-gray-600 '>
                  Price
                </label>
                <input
                  className='w-full px-4 py-3 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white'
                  id='price'
                  type='number'
                  placeholder='Price per unit'

                  {...register('price', {
                    required: 'Price is required',
                    min: {
                      value: 0,
                      message: "Price must be positive"
                    }
                  })}
                />
                {errors.price && <p className='text-red-600 text-sm'>{errors.price.message}</p>}
              </div>

              {/* Quantity */}
              <div className='space-y-1 text-sm'>
                <label htmlFor='quantity' className='block text-gray-600'>
                  Quantity
                </label>
                <input
                  className='w-full px-4 py-3 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white'
                  name='quantity'
                  id='quantity'
                  type='number'
                  placeholder='Available quantity'
                  {...register('quantity', {
                    required: 'Quantity is required',
                    min: {
                      value: 0,
                      message: "Quantity must be positive"
                    }
                  })}
                />
                {errors.quantity && <p className='text-red-600 text-sm'>{errors.quantity.message}</p>}
              </div>
            </div>
            {/* Image */}
            <div className=' p-4  w-full  m-auto rounded-lg grow'>
              <div className='file_upload px-5 py-3 relative border-4 border-dotted border-gray-300 rounded-lg'>
                <div className='flex flex-col w-max mx-auto text-center'>
                  <label>
                    <input
                      className='text-sm cursor-pointer w-36 hidden'
                      type='file'
                      name='image'
                      id='image'
                      accept='image/*'
                      hidden
                      {...register('image', {
                        required: 'Image is required'
                      })}
                    />
                    {errors.image && <p className='text-red-600 text-sm'>{errors.image.message}</p>}

                    <div className='bg-lime-500 text-white border border-gray-300 rounded font-semibold cursor-pointer p-1 px-3 hover:bg-lime-500'>
                      Upload
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type='submit'
              className='w-full cursor-pointer p-3 mt-5 text-center font-medium text-white transition duration-200 rounded shadow-md bg-lime-500 '
            >
              
              {isPending ? (
                <TbFidgetSpinner className='animate-spin m-auto' />
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AddPlantForm
