const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
const cors = require("cors");


require("dotenv").config();

app.use(express.json());
app.use(
  cors()
);


const port = process.env.PORT || 5000;

const newUri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASS}@rollersrepublic.opkzibp.mongodb.net/?retryWrites=true&w=majority`;
const newClient = new MongoClient(newUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.get("/", (req, res) => {
  res.send("Backend Working fine!");
});

newClient.connect((err) => {
  const productsCollection = newClient
    .db("RollersRepublic")
    .collection("product_list");
  const categoryListCollection = newClient
    .db("RollersRepublic")
    .collection("product_category_list");

  

  app.get("/getallProducts", async (req, res) => {
    const products = await getAllProducts(res);
    if (products?.length > 0) {
      res
        .status(201)
        .send({ success: true, data: products, message: "Data Found" });
    } else {
      res.status(201).send({
        success: true,
        data: [],
        message: "Data not Found",
      });
    }
  });

  //create category api
  app.post("/addProducts", async (req, res) => {
    const { all_products } = req.body;

    if (all_products?.length > 0) {
      try {
        const currentProducts = await productsCollection.find().toArray();

        const finalProducts = all_products.filter(
          (item2) =>
            !currentProducts.some((item1) => item1.barcode === item2.barcode)
        );
        const result = await productsCollection.insertMany(finalProducts);
        if (result.acknowledged) {
          res.status(201).send({
            success: true,
            data: result,
            message: "Properties Added Successfully",
          });
        } else {
          res.status(500).send({
            success: false,
            data: result,
            message: "Cannot Insert!",
          });
        }
      } catch (error) {
        res.status(500).send({ success: false, data: null, message: error });
      }

      // try {

      // } catch (error) {
      //   res.status(500).send({ success: false, data: null, message: error });
      // }
    }
  });

  app.patch("/updateProducts", async (req, res) => {
    const { all_products } = req.body;

    if (all_products?.length > 0) {
      const barcodes = all_products.map((product) => product.barcode);

      const productsExist = await productsCollection
        .find({ barcode: { $in: barcodes } })
        .toArray();

      if (productsExist.length === all_products.length) {
        try {
          const updatePromises = all_products.map((product) =>
            productsCollection.updateOne(
              { barcode: product?.barcode },
              { $set: { stock_level: product?.stock_level } }
            )
          );
          const updateResults = await Promise.all(updatePromises);

          // check if any update failed
          const updateFailed = updateResults.some(
            (result) => result.modifiedCount === 0
          );
          const noOfUpdatedCount = updateResults.filter(
            (itm) => itm.modifiedCount !== 0
          ).length;
          // const noOfFailedCount = updateResults.filter((itm)=>itm.modifiedCount === 0).length;
          if (updateFailed) {
            res.status(201).send({
              success: true,
              data: updateResults,
              message: `${noOfUpdatedCount} items are updated!`,
            });
          } else {
            res.status(201).send({
              success: true,
              data: updateResults,
              message: "Products updated successfully!",
            });
          }
        } catch (error) {
          res.status(500).send({
            success: false,
            data: null,
            message: error,
          });
        }
      } else {
        res.status(400).send({
          success: false,
          data: null,
          message: "One or more products not found in database",
        });
      }
    } else {
      res.status(400).send({
        success: false,
        data: null,
        message: "No products to update",
      });
    }
  });

  app.get("/categoryList", async (req, res) => {
    try {
      const categoryData = await getallCategories();
      if (categoryData?.length > 0) {
        res
          .status(201)
          .send({
            success: true,
            data: categoryData,
            message: "category found!",
          });
      } else {
        res
          .status(201)
          .send({ success: true, data: [], message: "category not found!" });
      }
    } catch (error) {
      res.status(404).send({ success: false, data: null, message: error });
    }
  });

  const getallCategories = async () => {
    const data = await categoryListCollection.find().toArray();
    if (data.length > 0) {
      return data;
    } else {
      return [];
    }
  };

  const getAllProducts = async (res) => {
    try {
      const data = await productsCollection.find().toArray();
      if (data.length > 0) {
        return data;
      } else {
        return null;
      }
    } catch (error) {
      res.status(404).send({ success: false, data: null, message: error });
    }
  };
});

app.listen(port, () => {
  console.log(`Server app listening at http://localhost:${port}`);
});
