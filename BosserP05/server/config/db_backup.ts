import { MongoClient } from "../../deps.ts";

// Variables de entorno para la configuración de la base de datos
const MONGODB_URI = Deno.env.get("MONGODB_URI") || 
  `mongodb+srv://${Deno.env.get("MONGO_USERNAME") || "fabiatronix2003"}:${Deno.env.get("MONGO_PASSWORD") || "bosser123"}@${Deno.env.get("MONGO_CLUSTER") || "cluster0.ldnjccq.mongodb.net"}/${Deno.env.get("DB_NAME") || "gestion_paquetes"}?retryWrites=true&w=majority&authSource=admin&authMechanism=SCRAM-SHA-1`;

const DB_NAME = Deno.env.get("DB_NAME") || "gestion_paquetes";

console.log("🔗 Iniciando configuración de MongoDB...");
console.log("🔐 Base de datos:", DB_NAME);

// Crear instancia del cliente
const client = new MongoClient();

// Función para conectar a MongoDB Atlas con timeout
async function connectToMongoDB() {
  try {
    console.log("🔗 Conectando usando MONGODB_URI...");
    
    // Conectar con timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout de conexión")), 10000)
    );
    
    const connectPromise = client.connect(MONGODB_URI);
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    // Seleccionar la base de datos
    const database = client.database(DB_NAME);
    
    // Test de conexión simple
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
    
    // Crear mock database para permitir que la app inicie
    console.log("⚠️ Usando mock database para permitir startup");
    return createMockDatabase();
  }
}

// Crear una base de datos mock para desarrollo/fallback
function createMockDatabase() {
  const mockCollection = {
    find: () => ({ toArray: async () => [], sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }),
    findOne: async () => null,
    insertOne: async () => ({ insertedId: "mock" }),
    updateOne: async () => ({ modifiedCount: 0 }),
    deleteOne: async () => ({ deletedCount: 0 }),
    countDocuments: async () => 0,
  };
  
  return {
    collection: () => mockCollection,
    listCollectionNames: async () => [],
  };
}

// Conectar y obtener la instancia de la base de datos
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
