import type { Package } from "../models/packageModel.ts";

// Tiempos en minutos para volver a notificar
const MIN_URGENTE_RENOTIF = 5;
const MIN_CONGELADO_RENOTIF = 30;
const MIN_FRAGIL_RENOTIF = 60 * 6;  // 6 horas
const MIN_OTRO_RENOTIF = 60 * 24;  // 24 horas

/**
 * Filtra los paquetes que deben recibir un recordatorio
 */
export function obtenerPaquetesPrioritarios(paquetes: Package[]): Package[] {
  const ahora = new Date();

  return paquetes.filter(pkg => {
    if (pkg.estado !== "Pendiente" || !pkg.ultima_notificacion) return false;

    const ultima = new Date(pkg.ultima_notificacion);
    const minutosDesdeUltima = (ahora.getTime() - ultima.getTime()) / (1000 * 60);

    switch (pkg.tipo) {
      case "Urgente":
        return minutosDesdeUltima >= MIN_URGENTE_RENOTIF;
      case "Congelado":
        return minutosDesdeUltima >= MIN_CONGELADO_RENOTIF;
      case "Frágil":
        return minutosDesdeUltima >= MIN_FRAGIL_RENOTIF;
      default:
        return minutosDesdeUltima >= MIN_OTRO_RENOTIF;
    }
  });
}
