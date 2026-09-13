export type GeolocationFailure =
  | "permission-denied"
  | "timeout"
  | "unavailable"
  | "unsupported";

export class GeolocationError extends Error {
  readonly reason: GeolocationFailure;

  constructor(reason: GeolocationFailure) {
    super(reason);
    this.name = "GeolocationError";
    this.reason = reason;
  }
}

export function geolocationErrorMessage(error: unknown): string {
  if (!(error instanceof GeolocationError)) {
    return "La position n’a pas pu être enregistrée. Réessayez.";
  }

  switch (error.reason) {
    case "permission-denied":
      return "Localisation refusée. Autorisez-la dans les réglages de votre navigateur, puis réessayez.";
    case "timeout":
      return "La localisation prend trop de temps. Vérifiez votre GPS ou votre connexion, puis réessayez.";
    case "unavailable":
      return "Votre position est momentanément indisponible. Activez le GPS, puis réessayez.";
    case "unsupported":
      return "La localisation n’est pas disponible dans ce navigateur.";
  }
}

export function getCurrentPosition(timeoutMs = 15000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeolocationError("unsupported"));
      return;
    }

    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      callback();
    };
    const safetyTimer = window.setTimeout(
      () => finish(() => reject(new GeolocationError("timeout"))),
      timeoutMs + 1000,
    );

    navigator.geolocation.getCurrentPosition(
      (position) => finish(() => resolve(position)),
      (error) => {
        const reason: GeolocationFailure =
          error.code === error.PERMISSION_DENIED
            ? "permission-denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable";
        finish(() => reject(new GeolocationError(reason)));
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30000,
      },
    );
  });
}