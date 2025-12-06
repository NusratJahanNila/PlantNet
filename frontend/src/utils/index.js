import axios from "axios";

// upload image from desktop
export const imageUpload = async (imageData) => {
    // form data from image field
    const formData = new FormData();
    formData.append('image', imageData);

    //2. generate img url from file
    const data = await axios.post(`https://api.imgbb.com/1/upload?&key=${import.meta.env.VITE_IMGBB_API_KEY}`, formData)
    // console.log("Data from Image: ",data.data.data.url)
    return data?.data?.data?.url;

}


// save or update user in db
export const saveOrUpdateUser=async(userData)=>{
    const result=await axios.post(`${import.meta.env.VITE_API_URL}/user`, userData)
    return result.data;
}