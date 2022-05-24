import express from "express";
import jwt from 'jsonwebtoken'
import bcrypt from "bcryptjs";
import env from 'dotenv'
import cryptoJs from "crypto-js";
import { rateLimit } from "express-rate-limit";
import conn from '../prisma/connection'
import { authCheck } from '../middleware/auth_check'
env.config()

const salt = bcrypt.genSaltSync(10)
const users_routes = express.Router()

const limitLogin = rateLimit({
    windowMs : 15 * 1000, //15 minute
    max : 10,
    standardHeaders : true,
    legacyHeaders : false,
    message : 'please wait a few more seconds..'
})

// CREATE USERS
users_routes.post("/users/create", async (req, res)=>{
    try {
        const data = await req.body

        const createUsers = await conn.users.create({
            data : {
                email : data.email,
                role : data.role,
                password : bcrypt.hashSync(data.password, salt)
            }
        })

        res.status(201).json({
            success : true,
            query : createUsers
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// LOGIN USERS
users_routes.post("/users/login", async(req, res) =>{
    try {
        const {email, password} = await req.body
        const checkUsers = await conn.users.findUnique({
            where : {
                email : email
            }
        })

        if(!checkUsers) {
            res.status(404).json({
                success : false,
                message : "Email not found"
            })
            return
        }

        const comparePassword = await bcrypt.compareSync(password, checkUsers.password)

        if(!comparePassword) {
            res.status(401).json({
                success : false,
                message : "Wrong password.."
            })
            return
        }

        const token = await jwt.sign(
            {
                app_name : "simple_marketplace",
                id : checkUsers.id,
                email : checkUsers.email,
                role : checkUsers.role,
            },
            process.env.API_SECRET,
            {
                expiresIn : '1d'
            }
        )

        const hashToken = await cryptoJs.AES.encrypt(token, process.env.API_SECRET).toString()

        res.status(200).json({
            success : true,
            token : hashToken
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// READ USERS
users_routes.get("/users/read", authCheck, async(req, res)=>{
    try {
        const { page = 1, limit = 10} = await req.query
        let skip = (page - 1) * limit
        const result = await conn.users.findMany({
            take : parseInt(limit),
            skip : parseInt(skip),
            orderBy : { id : "desc"},
        })

        const cn = await conn.users.count()

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

// UPDATE USERS
users_routes.put("/users/update", authCheck, async(req, res)=>{
    try {
        const data = await req.body
        const result = await conn.users.update({
            where : {
                id : parseInt(data.id)
            },
            data : {
                email : data.email,
                password : data.password
            }
        })

        res.status(201).json({
            success : true,
            message : "Successfully update data"
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// DELETE USERS
users_routes.delete("/users/delete", authCheck, async(req, res)=>{
    try {
        const {id} = await req.body
        const result = await conn.users.delete({
            where : {
                id : parseInt(id)
            }
        })

        res.status(201).json({
            success : true,
            message : "Successfully delete data"
        })
    } catch (error) {
        res.status(500).json({
            success : false,
            error : error.message
        })
    }
})

// FIND USERS
users_routes.post("/users/find", async(req, res) =>{
    try {
        const { page = 1, limit = 10} = req.query
        let skip = (page - 1) * limit
        const { filter } = await req.body
        const result = await conn.users.findFirst({
            where : filter,
            take : parseInt(page),
            skip : parseInt(skip),
            orderBy : { id : 'desc'},
        })

        const cn = await conn.users.count()

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

export default users_routes