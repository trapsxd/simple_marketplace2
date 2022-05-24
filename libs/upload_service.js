import multer from "multer"
import path from "path"

// product storage
const product_storage = multer.diskStorage({
	filename: (req, files, cb) => {
		cb(null, Date.now() + "_" + files.originalname)
	},
	destination: (req, files, cb) => {
		cb(null, path.join(__dirname, `../static/public/uploads/product`))
	},
})

const product_upload = multer({
	storage: product_storage,
	limits: {
		fileSize: 50000000,
	},
})

export default product_upload
