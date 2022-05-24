import express from "express";
import env from 'dotenv'
import path from 'path'
import fs from 'fs'
import product_upload from "../libs/upload_service";
import { authCheck } from "../middleware/auth_check";
import conn from "../prisma/connection";
env.config()

const product_routes = express.Router()

// CREATE PRODUCT
product_routes.post("/product/create", product_upload.array("photo"), authCheck, async(req, res)=>{
    try {
        const data = await req.body
        console.info(data)
        const file = await req.files

        // array file list
        let dataFile = []

        // push array to file object
        const generateFileData = await file.forEach((e)=>{
            dataFile.push({
                filename : e.filename,
                location : `/public/uploads/product/${e.filename}`
            })
        })

        console.info(dataFile)

        const store = await conn.product.create({
            data : {
                name : data.name,
                sku : data.sku,
                qty : parseInt(data.qty),
                price : parseInt(data.price),
                product_photo : {
                    createMany : {
                        data : dataFile
                    }
                }

            }
        })

        res.status(201).json({
            success : true,
            query : store
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// READ PRODUCT
product_routes.get("/product/read", async (req, res) =>{
    try {
        const {page = 1, limit = 10} = await req.query
        const { filter } = await req.body
        const skip = (page - 1) * limit
        const result = await conn.product.findMany({
            skip : parseInt(skip),
            take : parseInt(limit),
            orderBy : {
                id : 'desc'
            },
            where : filter,
            include : {
                product_photo : {
                    select : {
                        id : true,
                        filename : true,
                        location : true
                    }
                }
            }
        })

        const cn = await conn.product.count()

        res.status(200).json({
            success : true,
            current_page: parseInt(page),
            total_page : Math.ceil(cn / limit),
            total_data : cn,
            query :result
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// UPDATE PRODUCT
product_routes.put("/product/update", product_upload.none(), authCheck, async(req, res)=>{
    try {
        const data = await req.body
        const file = await req.files
        const findProduct = await conn.product.findUnique({
            where : {
                id : parseInt(data.id)
            },
        })

        const updateProduct = await conn.product.update({
            where : {
                id : parseInt(data.id)
            },
            data : {
                name : data.name,
                sku : data.sku,
                qty :parseInt(data.qty),
                price : parseInt(data.price)
            },
        })

        res.status(201).json({
            success : true,
            message : 'Successfully update product'
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// DELETE PRODUCT
product_routes.delete("/product/delete", product_upload.array("photo"), authCheck, async(req, res) => {
    try {
        const data = await req.body
        const file = await req.files
        const result = await conn.product.delete({
            where : {
                id: parseInt(data.id)
            },
            include : {
                product_photo : {
                    select : {
                        id : true,
                        filename : true
                    }
                }
            }
        })

        if(!result) {
            res.status(401).json({
                success : false,
                message : "Data not found"
            })
            return
        }

        // DELETE PRODUCT PHOTO FROM SERVER
        result.product_photo.forEach((e)=>{
            fs.unlinkSync(path.join(__dirname, `../static/public/uploads/product/${e.filename}`))
        })

        res.status(201).json({
            success : true,
            message : "Successfully delete product"
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// FIND PRODUCT
product_routes.post("/product/find", async(req,res) =>{
    try {
        const { page = 1, limit = 10} = req.query
        let skip = (page - 1) * limit
        const { filter } = await req.body
        const result = await conn.product.findFirst({
            where : filter,
            take : parseInt(page),
            skip : parseInt(skip),
            orderBy : {id : "desc"},
            include : {
                product_photo : {
                    select : {
                        id : true,
                        filename : true,
                        location : true
                    }
                }
            }
        })

        const cn = await conn.product.count()

        res.status(200).json({
            current_page : parseInt(page),
            total_page : Math.ceil(cn / limit),
            total_data : cn,
            success : true,
            query : result
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message   
        })
    }
})

export default product_routes