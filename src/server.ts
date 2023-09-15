import { app } from "./app";

app
  .listen({
    port: 3333,
  })
  .then(() => {
    console.log("🚀 Server started on port http://localhost:3333");
  });
