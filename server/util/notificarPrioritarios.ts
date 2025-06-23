import { packages } from "../config/db.ts"; 
import { obtenerPaquetesPrioritarios } from "./prioridadPaquetes.ts";
import { enviarCorreo } from "./email.ts";

/**
 * Revisa paquetes pendientes y envía recordatorios con detalles correctos.
 */
export async function notificarPrioritarios() {
  try {
    // 1. Obtener todos los paquetes pendientes
    const paquetes = await packages.find({ estado: "Pendiente" }).toArray();

    // 2. Filtrar los que necesitan recordatorio según última notificación
    const lista = obtenerPaquetesPrioritarios(paquetes);

    console.log(`🔔 Enviando recordatorios para ${lista.length} paquetes prioritarios...`);

    for (const pkg of lista) {
      const fechaRecepcion = pkg.fecha_recepcion instanceof Date
        ? pkg.fecha_recepcion
        : new Date(pkg.fecha_recepcion);

      // 3. Enviar correo de recordatorio
      await enviarCorreo(
        pkg.destinatario,
        pkg.departamento,
        pkg.tipo,
        fechaRecepcion,
        pkg.tracking_id,
        true // es un recordatorio
      );

      // 4. Actualizar fecha de última notificación
      await packages.updateOne(
        { tracking_id: pkg.tracking_id },
        {
          $set: {
            ultima_notificacion: new Date(), // actualizar fecha de notificación
          },
        }
      );

      console.log(`✅ Recordatorio enviado: ${pkg.tracking_id}`);
    }

    console.log("🚀 Finalizó notificarPrioritarios");
  } catch (err) {
    console.error("❌ Error en notificarPrioritarios:", err);
  }
}
