import { MongoClient } from "../../deps.ts";

// Variables de entorno para la configuración de la base de datos
const MONGODB_URI = Deno.env.get("MONGODB_URI") || 
  `mongodb+srv://${Deno.env.get("MONGO_USERNAME") || "fabiatronix2003"}:${Deno.env.get("MONGO_PASSWORD") || "bosser123"}@${Deno.env.get("MONGO_CLUSTER") || "cluster0.ldnjccq.mongodb.net"}/${Deno.env.get("DB_NAME") || "gestion_paquetes"}?retryWrites=true&w=majority&authSource=admin&authMechanism=SCRAM-SHA-1`;

const DB_NAME = Deno.env.get("DB_NAME") || "gestion_paquetes";

console.log("🔗 Conectando a MongoDB Atlas...");
console.log("🔐 Base de datos:", DB_NAME);

// Crear instancia del cliente
const client = new MongoClient();

// Función para conectar a MongoDB Atlas
async function connectToMongoDB() {
  try {
    console.log("🔗 Conectando usando MONGODB_URI...");
    
    // Conectar usando la URI de MongoDB Atlas
    await client.connect(MONGODB_URI);
    
    // Seleccionar la base de datos
    const database = client.database(DB_NAME);
    
    // Test de conexión simple - intentar listar las colecciones
    try {
      await database.listCollectionNames();
      console.log("✅ Conectado exitosamente a MongoDB Atlas");
    } catch (_pingError) {
      console.log("⚠️ Conexión establecida pero sin poder hacer ping completo");
    }
    
    return database;
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB Atlas:");
    console.error("   Base de datos:", DB_NAME);
    console.error("   Error detallado:", error);
    
    throw error;
  }
}

// Conectar inmediatamente y obtener la instancia de la base de datos
const db = await connectToMongoDB();

// Exportar colecciones
export const packages = db.collection("packages");
export const residents = db.collection("residents");
export const usuarios = db.collection("usuarios");

// Función para obtener la base de datos
export function getDatabase() {
  return db;
}

// Función para cerrar la conexión
export async function closeConnection(): Promise<void> {
  try {
    await client.close();
    console.log("🔌 Conexión a MongoDB cerrada");
  } catch (error) {
    console.error("❌ Error al cerrar la conexión:", error);
  }
}

export default db;
