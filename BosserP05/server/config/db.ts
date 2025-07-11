import { MongoClient } from "../../deps.ts";

// Variables de entorno para la configuración de la base de datos
const MONGODB_URI = Deno.env.get("MONGODB_URI") || 
  `mongodb+srv://${Deno.env.get("MONGO_USERNAME") || "fabiatronix2003"}:${Deno.env.get("MONGO_PASSWORD") || "bosser123"}@${Deno.env.get("MONGO_CLUSTER") || "cluster0.ldnjccq.mongodb.net"}/${Deno.env.get("DB_NAME") || "gestion_paquetes"}?retryWrites=true&w=majority&authSource=admin&authMechanism=SCRAM-SHA-1`;

const DB_NAME = Deno.env.get("DB_NAME") || "gestion_paquetes";

console.log("🔗 Iniciando configuración de MongoDB...");
console.log("🔐 Base de datos:", DB_NAME);

// Estado de la conexión
let client: MongoClient | null = null;
// deno-lint-ignore no-explicit-any
let database: any = null;
let isConnected = false;

// Función para conectar a MongoDB Atlas
async function connectToMongoDB() {
  if (isConnected && database) {
    return database;
  }

  try {
    console.log("🔗 Conectando usando MONGODB_URI...");
    
    client = new MongoClient();
    
    // Timeout de conexión más corto para evitar bloqueos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout")), 10000)
    );
    
    await Promise.race([
      client.connect(MONGODB_URI),
      timeoutPromise
    ]);
    
    database = client.database(DB_NAME);
    
    try {
      await database.listCollectionNames();
      console.log("✅ Conectado exitosamente a MongoDB Atlas");
      isConnected = true;
    } catch (_pingError) {
      console.log("⚠️ Conexión establecida pero sin poder hacer ping completo");
      isConnected = true;
    }
    
    return database;
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error al conectar a MongoDB Atlas:", err.message);
    console.log("⚠️ Continuando sin base de datos real...");
    isConnected = false;
    return null;
  }
}

// Función para obtener colección con fallback
async function getCollection(name: string) {
  if (!database) {
    database = await connectToMongoDB();
  }
  
  if (database) {
    return database.collection(name);
  }
  
  // Fallback mock
  return {
    find: () => ({ 
      toArray: () => Promise.resolve([]), 
      sort: () => ({ 
        limit: () => ({ 
          toArray: () => Promise.resolve([]) 
        }) 
      }) 
    }),
    findOne: () => Promise.resolve(null),
    insertOne: () => Promise.resolve({ insertedId: "mock" }),
    updateOne: () => Promise.resolve({ modifiedCount: 0 }),
    deleteOne: () => Promise.resolve({ deletedCount: 0 }),
    countDocuments: () => Promise.resolve(0),
  };
}

// deno-lint-ignore no-explicit-any
type DbArgs = any[];

// Exportar colecciones con lazy loading
export const packages = {
  find: async (...args: DbArgs) => (await getCollection("packages")).find(...args),
  findOne: async (...args: DbArgs) => (await getCollection("packages")).findOne(...args),
  insertOne: async (...args: DbArgs) => (await getCollection("packages")).insertOne(...args),
  updateOne: async (...args: DbArgs) => (await getCollection("packages")).updateOne(...args),
  deleteOne: async (...args: DbArgs) => (await getCollection("packages")).deleteOne(...args),
  countDocuments: async (...args: DbArgs) => (await getCollection("packages")).countDocuments(...args),
};

export const residents = {
  find: async (...args: DbArgs) => (await getCollection("residents")).find(...args),
  findOne: async (...args: DbArgs) => (await getCollection("residents")).findOne(...args),
  insertOne: async (...args: DbArgs) => (await getCollection("residents")).insertOne(...args),
  updateOne: async (...args: DbArgs) => (await getCollection("residents")).updateOne(...args),
  deleteOne: async (...args: DbArgs) => (await getCollection("residents")).deleteOne(...args),
};

export const usuarios = {
  find: async (...args: DbArgs) => (await getCollection("usuarios")).find(...args),
  findOne: async (...args: DbArgs) => (await getCollection("usuarios")).findOne(...args),
  insertOne: async (...args: DbArgs) => (await getCollection("usuarios")).insertOne(...args),
  updateOne: async (...args: DbArgs) => (await getCollection("usuarios")).updateOne(...args),
  deleteOne: async (...args: DbArgs) => (await getCollection("usuarios")).deleteOne(...args),
};

// Función para obtener la base de datos
export async function getDatabase() {
  if (!database) {
    database = await connectToMongoDB();
  }
  return database;
}

// Función para cerrar la conexión
export async function closeConnection(): Promise<void> {
  try {
    if (client) {
      await client.close();
      console.log("🔌 Conexión a MongoDB cerrada");
    }
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error al cerrar la conexión:", err.message);
  }
}

// NO intentar conectar al inicio - solo cuando sea necesario
console.log("🔗 Configuración de MongoDB lista (conexión lazy)");

export default { packages, residents, usuarios };
