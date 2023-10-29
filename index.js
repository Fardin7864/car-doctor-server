const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')

require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7k1zdza.mongodb.net/?retryWrites=true&w=majority`;


//middle ware

app.use(cors(
{
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // Add 'POST' here

}
))
app.use(express.json());
app.use(cookieParser())

//custom middlewares
const logger = async(req, res, next) => {
  console.log("Called", req.host, req.originalUrl)
  next();
}

const verifyToken = async (req, res, next) => { 
  const token = req.cookies?.token;
  // console.log('valu of token in middleware', token)
if (!token) {
  return res.status(401).send({message: 'Forbidden'})
}

jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => 
{if (err) {
  console.log(err)
  return res.status(401).send({message: 'Forbidden'})
}
console.log('value in token', decoded)
req.user = decoded;
  next()
})


 }


app.get('/', (req, res ) => { 
    res.send("Car doctor server is runnig!")
 })

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    //collection
    const servicesColl = client.db('car-doctor').collection('services');

    //auth related api
  app.post('/jwt', logger,async (req,res ) => { 
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
    console.log(token);
    res.cookie('token',token,{ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', })
    .send({success: true})
   })


    // services related api
    app.get('/services', async (req, res ) => { 
      const result = await servicesColl.find().toArray();
      res.send(result)
     })

    app.post('/services', async (req, res ) => { 
        const service = req.body;
        const result = await servicesColl.insertOne(service)
        res.send(result);
     })

    app.get('/services/:id',async (req, res ) => { 
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await servicesColl.findOne(query);
      res.send(result);
     })


    //cart
    const cartColl = client.db('car-doctor').collection('cart');

    app.get('/cart/:email',verifyToken,async (req, res ) => { 
      const email = req.params.email;
      const query = {email: email}
      if (req.query.email !== req.user.emial) {
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await cartColl.find(query).toArray();
      res.send(result);
     })
  
  app.get('/cart',async (req, res ) => { 
    const result = await cartColl.find().toArray();
    res.send(result)
   })
  app.post('/cart', async (req, res ) => { 
    const service = req.body;
    const result = await cartColl.insertOne(service)
    res.send(result);
   })

  app.delete('/cart/:id', async (req,res) => { 
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await cartColl.deleteOne(query)
    res.send(result);
   })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => { 
    console.log(`server is running on port: ${port}`)
 })