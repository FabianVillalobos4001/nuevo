// server/api/verify_resident.ts
import { MongoClient} from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { RouterContext } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { Resident } from "../models/residentModel.ts"; 
import { Package } from "../models/packageModel.ts"; // <--- también importa Package
import * as bcrypt from "https://deno.land/x/bcrypt@v0.3.0/mod.ts";

// Conexión a MongoDB
const client = new MongoClient();
await client.connect("mongodb://127.0.0.1:27017");
const db = client.database("gestion_paquetes");
const residents = db.collection<Resident>("residents");
const packages = db.collection<Package>("packages"); // <--- también conecta a "packages"

export const handler = async (ctx: RouterContext<"/api/verify_resident">) => {
  try {
    const { email, password } = await ctx.request.body({ type: "json" }).value;

    // Buscar al residente
    const resident = await residents.findOne({ email });

    if (!resident) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Credenciales incorrectas." };
      return;
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, resident.password);

    if (!passwordMatch) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Credenciales incorrectas." };
      return;
    }

    // Asignar un valor fijo de 1 para el userKey
    const userKey = "1"; // Fijamos el valor de la clave a "1"

    // Buscar los paquetes PENDIENTES asociados al departamento del residente
    const pendingPackages = await packages.find({
      departamento: resident.departamento,
      estado: "Pendiente",
    }).toArray(); // <-- conviértelo a array

    // Responder con éxito, la clave generada (userKey) y los paquetes
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Login exitoso.",
      userKey, // Devolvemos la clave fija aquí
      departamento: resident.departamento,
      packages: pendingPackages, // <- devolvemos los paquetes aquí
    };
  } catch (error) {
    // Manejo de errores en el servidor
    console.error("Error en la verificación de residente:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Error interno en el servidor." };
  }
};
