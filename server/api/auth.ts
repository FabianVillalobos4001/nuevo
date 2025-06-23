import { hash } from "https://deno.land/x/bcrypt/mod.ts";
import { MongoClient,} from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { RouterContext } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { Resident } from "../models/residentModel.ts"; // Asegúrate de importar el modelo actualizado

// Conexión a MongoDB
const client = new MongoClient();
await client.connect("mongodb://127.0.0.1:27017");
const db = client.database("gestion_paquetes");
const residents = db.collection<Resident>("residents"); // Colección de residentes

export const handleSignup = async (ctx: RouterContext<"/api/signup_resident">) => {
  const { nombre, telefono, email, password, departamento } = await ctx.request.body({ type: "json" }).value;

  // Encriptar la contraseña
  const hashedPassword = await hash(password);

  const newResident: Resident = {
    nombre,
    telefono,
    email,
    password: hashedPassword, // Contraseña encriptada
    departamento,
  };

  // Guardar el nuevo residente en la base de datos
  await residents.insertOne(newResident);

  ctx.response.status = 200;
  ctx.response.body = { message: "¡Residente registrado con éxito!" };
};
