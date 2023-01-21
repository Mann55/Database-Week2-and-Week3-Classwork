const express = require("express");
const app = express();

const { Pool } = require('pg');

const bodyParser = require("body-parser");
const { query } = require("express");
app.use(bodyParser.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cyf_hotels',
  //database: 'cyf-ecommerce-api',
  password: '12345',
  port: 5432
});

app.get("/", (req, res) => {
  res.send("Node JS and SQL Hotel Database");
});

// to get all the hotels
app.get("/hotels", function (req, res) {
  pool
    .query("SELECT * FROM hotels")
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

// get hotel by a specific name 
app.get("/hotels", function (req, res) {
  const hotelNameQuery = req.query.name;
  let query = `SELECT * FROM hotels ORDER BY name`;

  if (hotelNameQuery) {
    query = `SELECT * FROM hotels WHERE name LIKE '%${hotelNameQuery}%' ORDER BY name`;
  }

  pool
    .query(query)
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

// get hotels by id
app.get("/hotels/:hotelId", function (req, res) {
  const hotelId = req.params.hotelId;

  pool
    .query("SELECT * FROM hotels WHERE id=$1", [hotelId])
    .then((result) =>  
       // res.json(result.rows)) 
       result.rows.map((row)=>{
        return res.send(row.name) 
       }))
    .catch((e) => console.error(e));
});



// Add new endpoint to create a new hotel
app.post("/hotels", function (req, res) {
  const newHotelName = req.body.name;
  const newHotelRooms = req.body.rooms;
  const newHotelPostcode = req.body.postcode;

  if (!Number.isInteger(newHotelRooms) || newHotelRooms <= 0) {
    return res
      .status(400)
      .send("The number of rooms should be a positive integer.");
  }

  pool
    .query("SELECT * FROM hotels WHERE name=$1", [newHotelName])
    .then((result) => {
      if (result.rows.length > 0) {
        return res
          .status(400)
          .send("An hotel with the same name already exists!");
      } else {
        const query =
          "INSERT INTO hotels (name, rooms, postcode) VALUES ($1, $2, $3)";
        pool
          .query(query, [newHotelName, newHotelRooms, newHotelPostcode])
          .then(() => res.send("Hotel created!"))
          .catch((e) => console.error(e));
      }
    });
});


// select all the customers and customer by a specific name 
app.get("/customers", function (req, res) {
  const customerNameQuery = req.query.name;
  let query = `SELECT * FROM customers ORDER BY name`;

  if (customerNameQuery) {
    "SELECT * FROM customers WHERE LOWER(name) LIKE LOWER('%${customerNameQuery}%)' ORDER BY name";
  }

  pool
    .query(query)
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});


// get customer by id
app.get("/customers/:customerId", function (req, res) {
  const customerId = req.params.customerId;

  pool
    .query("SELECT * FROM customers WHERE id=$1", [customerId])
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});


// get customer by /customers/:customerId/bookings
app.get("/customers/:customerId/bookings", function (req, res) {
  const customerId = req.params.customerId;
  let query = `select 
    c."name", b.checkin_date, b.nights, h."name", h.postcode  from bookings b  
    inner join customers c on c.id = b.customer_id 
    inner join hotels h on h.id = b.hotel_id
    where customer_id = $1;`;

  pool
    .query(query, [customerId])
    .then(() => res.send(`Customer ${customerId} updated!`))
    .catch((e) => console.error(e));
});


// create a new customer
app.post("/customers", function (req, res) {
  const newCustomerlName = req.body.name;
  const newCustomerlAddress = req.body.address;
  const newCustomerCity = req.body.city;
  const newCustomerCountry = req.body.country;


  pool
    .query("SELECT * FROM customers WHERE name=$1", [newCustomerlName])
    .then((result) => {
      if (result.rows.length > 0) {
        return res
          .status(400)
          .send("A customer with the same name already exists!");
      } else {
        const query =
          "INSERT INTO customers (name, address, city, country) VALUES ($1, $2, $3, $4)";
        pool
          .query(query, [newCustomerlName, newCustomerlAddress, newCustomerCity, newCustomerCountry])
          .then(() => res.send("Customer created!"))
          .catch((e) => console.error(e));
      }
    });
});

// Add the PATCH endpoint /customers/:customerId and verify you can update a customer email using Postman.
app.patch("/customers/:customerId", (req, res) => {
  const customerId = req.params.customerId;
  const newEmail = req.body.email;


  if (newEmail <= 0) {
    return res
      .status(400)
      .send("The email should'nt be empty.");
  }

  pool
    .query("UPDATE customers SET  email=$1 WHERE id=$2", [newEmail, customerId])
    .then((result) => {
      if (result.rowCount > 0) {
        return res.send(`Customer ${customerId} updated!`)
      } else {
        return res.send(`Customer ${customerId} not found!`)
      }
    })
    .catch((e) => console.error(e));
});


// Add the DELETE endpoint /customers/:customerId above and verify you can delete a customer
app.delete("/customers/:customerId", (req, res) => {
  const customerId = req.params.customerId;

  pool
    .query("DELETE FROM bookings WHERE customer_id=$1", [customerId])
    .then(() => {
      pool
        .query("DELETE FROM customers WHERE id=$1", [customerId])
        .then(() => res.send(`Customer ${customerId} deleted`))
        .catch((e) => console.error(e));
    })
    .catch((e) => console.error(e));
});


// Add a new DELETE endpoint /hotels/:hotelId to delete a specific hotel.
// A hotel can only be deleted if it doesn't appear in any of the customers' bookings! 
app.delete("/hotels/:hotelId", (req, res) => {
  const hotelId = req.params.hotelId;

  pool
    .query("SELECT FROM bookings WHERE hotel_id=$1", [hotelId])
    .then((result) => {
      if(result.rowCount == 0){
        pool
        .query("DELETE FROM hotels WHERE id=$1", [hotelId])
        .then(() => res.send(`Hotel ${hotelId} deleted!`))
        .catch((e) => console.error(e));
      }else{
        res.send(`Cannot delete hotel with id ${hotelId}`)
      }
     
    })
    .catch((e) => console.error(e));
});

app.listen(3000, function () {
  console.log("Server is listening on port 3000. Ready to accept requests!");
});