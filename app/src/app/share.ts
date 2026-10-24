// Partage du lien de suivi : feuille de partage native, sinon copie.

export type ShareResult = "native" | "copied" | "cancelled" | "failed";

export async function shareLink(url: string, text: string, title: string): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "native";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
