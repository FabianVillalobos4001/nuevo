import { MongoClient, ObjectId } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { RouterContext } from "../../deps.ts";

import { Package } from "../models/packageModel.ts";
import { enviarCorreo } from "../util/email.ts";
import { obtenerPaquetesPrioritarios } from "../util/prioridadPaquetes.ts";

const client = new MongoClient();
await client.connect("mongodb://127.0.0.1:27017");
const db = client.database("gestion_paquetes");
const packages = db.collection<Package>("packages");

// Ruta para registrar un paquete
export const handler = async (ctx: RouterContext<"/api/paquetes">) => {
  try {
    const { destinatario, departamento, tipo } = await ctx.request.body({ type: "json" }).value;

    if (!destinatario || !departamento || !tipo) {
      ctx.response.status = 400;
      ctx.response.body = { message: "❌ Todos los campos son obligatorios." };
      return;
    }

    // Generar tracking_id incremental (opcionalmente puedes usar un contador global)
    const lastPackage = await packages.find().sort({ fecha_recepcion: -1 }).limit(1).toArray();
    const tracking_id = lastPackage.length > 0
      ? (parseInt(lastPackage[0].tracking_id) + 1).toString().padStart(6, "0")
      : "000001";

    // Generar código de entrega aleatorio de 5 dígitos
    const codigo_entrega = Math.floor(10000 + Math.random() * 90000).toString();

    const newPackage: Package = {
      tracking_id,
      destinatario,
      departamento,
      tipo,
      estado: "Pendiente",
      fecha_recepcion: new Date(),
      notificado: false,
      codigo_entrega,
    };

    const result = await packages.insertOne(newPackage);

    try {
      await enviarCorreo(
        destinatario,
        departamento,
        tipo,
        newPackage.fecha_recepcion,
        tracking_id
      );
      await packages.updateOne(
        { _id: result },
        {
          $set: {
            notificado: true,
            ultima_notificacion: new Date() // ✅ CLAVE para que funcione la lógica de reenvío
          }
        }
      );
    } catch (error) {
      console.error("Error enviando el correo:", error);
    }

    ctx.response.status = 200;
    ctx.response.body = {
      message: `✅ Paquete recibido con ID: ${tracking_id}`,
      tracking_id,
      codigo_entrega,
    };
  } catch (err) {
    console.error("Error en handler /api/paquetes:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error en el registro del paquete" };
  }
};

// Validar código de entrega y marcar como recibido
export const validarCodigoEntrega = async (
  ctx: RouterContext<"/api/paquetes/validar-codigo">
) => {
  try {
    const { tracking_id, codigo_entrega } = await ctx.request.body({ type: "json" }).value;

    const paquete = await packages.findOne({ tracking_id });
    if (!paquete) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Paquete no encontrado" };
      return;
    }

    if (paquete.codigo_entrega === codigo_entrega) {
      await packages.updateOne(
        { tracking_id },
        { $set: { estado: "Entregado" } }
      );
      ctx.response.status = 200;
      ctx.response.body = { message: "Código válido. Paquete entregado." };
    } else {
      ctx.response.status = 400;
      ctx.response.body = { message: "Código incorrecto" };
    }
  } catch (err) {
    console.error("Error en validarCodigoEntrega:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al validar el código" };
  }
};

// Obtener paquetes pendientes de un residente
export const getPaquetesResidente = async (
  ctx: RouterContext<"/api/paquetes/residente">
) => {
  try {
    const user = ctx.state.user;
    let departamento = user?.departamento;

    if (!departamento) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Departamento requerido" };
      return;
    }

    departamento = departamento.trim().toLowerCase();

    const paquetes = await packages.find({
      departamento,
      estado: "Pendiente",
    }).limit(50).toArray();

    ctx.response.status = 200;
    ctx.response.body = paquetes;
  } catch (err) {
    console.error("Error en getPaquetesResidente:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al buscar paquetes" };
  }
};

export const marcarPaqueteRecibido = async (
  ctx: RouterContext<"/api/paquetes/:id/recibido">
) => {
  try {
    const id = ctx.params.id;
    if (!id) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID del paquete es requerido" };
      return;
    }

    const { modifiedCount } = await packages.updateOne(
      { _id: new ObjectId(id) },
      { $set: { estado: "Entregado" } },
    );

    if (modifiedCount === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Paquete no encontrado" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { message: "Paquete marcado como recibido" };
  } catch (error) {
    console.error("Error en marcarPaqueteRecibido:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error actualizando el paquete" };
  }
};

export const notificarPaquetesPrioritarios = async (
  ctx: RouterContext<"/api/paquetes/notificar-prioritarios">
) => {
  try {
    const paquetesPendientes = await packages.find({ estado: "Pendiente" }).toArray();

    const prioritarios = obtenerPaquetesPrioritarios(paquetesPendientes);

    let notificados = 0;
    for (const pkg of prioritarios) {
      try {
        const fechaRecepcion = pkg.fecha_recepcion instanceof Date
          ? pkg.fecha_recepcion
          : new Date(pkg.fecha_recepcion);

        await enviarCorreo(
          pkg.destinatario,
          pkg.departamento,
          pkg.tipo,
          fechaRecepcion,
          pkg.tracking_id,
          true
        );
        await packages.updateOne({ _id: pkg._id }, { $set: { notificado: true } });
        notificados++;
      } catch (err) {
        console.error(`Error notificando a ${pkg.destinatario}:`, err);
      }
    }

    ctx.response.status = 200;
    ctx.response.body = {
      message: `Se notificaron ${notificados} paquetes prioritarios.`,
      paquetes: prioritarios.map(p => p.tracking_id),
    };
  } catch (err) {
    console.error("Error en notificarPaquetesPrioritarios:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error notificando paquetes prioritarios" };
  }
};

export const getHistorialResidente = async (
  ctx: RouterContext<"/api/paquetes/historial">
) => {
  try {
    const user = ctx.state.user;
    let departamento = user?.departamento;
    if (!departamento) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Departamento requerido" };
      return;
    }
    departamento = departamento.trim().toLowerCase();

    const page = Number(ctx.request.url.searchParams.get("page")) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const total = await packages.countDocuments({ departamento });
    const historial = await packages.find({ departamento })
      .sort({ fecha_recepcion: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    ctx.response.status = 200;
    ctx.response.body = {
      historial,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al buscar historial" };
  }
};

export const getTodosLosPaquetes = async (
  ctx: RouterContext<"/api/paquetes/all">
) => {
  try {
    const paquetes = await packages.find({})
      .sort({ fecha_recepcion: -1 })
      .toArray();

    ctx.response.status = 200;
    ctx.response.body = paquetes;
  } catch (err) {
    console.error("Error en getTodosLosPaquetes:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al obtener todos los paquetes" };
  }
};