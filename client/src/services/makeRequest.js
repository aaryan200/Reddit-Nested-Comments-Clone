import axios from "axios";

const api= axios.create({
    baseURL: process.env.REACT_APP_SERVER_URL,
    withCredentials: true,
});

export async function makeRequest(url, options) {
    return await api(url, options)
    .then(res => res.data)
    .catch(err => Promise.reject(err?.response?.data?.message ?? "Error"));
    // it will either return a custom message or the text "Error"
}