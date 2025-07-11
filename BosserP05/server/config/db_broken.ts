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
  
  return {
    collection: () => mockCollection,
    listCollectionNames: () => Promise.resolve([]),
  };
}

// Inicializar con mock database por defecto
let db = createMockDatabase();

// Función para conectar de forma asíncrona (no bloquea el startup)
connectToMongoDB().then(database => {
  db = database;
  console.log("✅ Base de datos inicializada");
}).catch(error => {
  console.error("⚠️ Manteniendo mock database:", error.message);
});

// Exportar colecciones que siempre funcionarán
export const packages = {
  find: (...args: unknown[]) => db.collection("packages").find(...args),
  findOne: (...args: unknown[]) => db.collection("packages").findOne(...args),
  insertOne: (...args: unknown[]) => db.collection("packages").insertOne(...args),
  updateOne: (...args: unknown[]) => db.collection("packages").updateOne(...args),
  deleteOne: (...args: unknown[]) => db.collection("packages").deleteOne(...args),
  countDocuments: (...args: unknown[]) => db.collection("packages").countDocuments(...args),
};

export const residents = {
  find: (...args: unknown[]) => db.collection("residents").find(...args),
  findOne: (...args: unknown[]) => db.collection("residents").findOne(...args),
  insertOne: (...args: unknown[]) => db.collection("residents").insertOne(...args),
  updateOne: (...args: unknown[]) => db.collection("residents").updateOne(...args),
  deleteOne: (...args: unknown[]) => db.collection("residents").deleteOne(...args),
};

export const usuarios = {
  find: (...args: unknown[]) => db.collection("usuarios").find(...args),
  findOne: (...args: unknown[]) => db.collection("usuarios").findOne(...args),
  insertOne: (...args: unknown[]) => db.collection("usuarios").insertOne(...args),
  updateOne: (...args: unknown[]) => db.collection("usuarios").updateOne(...args),
  deleteOne: (...args: unknown[]) => db.collection("usuarios").deleteOne(...args),
};

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
