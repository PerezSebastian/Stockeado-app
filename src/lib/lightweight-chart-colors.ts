function isLegacyColorString(color: string) {
  return /^(rgb|rgba|#)/i.test(color.trim());
}

function colorToRgbString(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return color;
  }

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#000000";

  try {
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;

    if (a === 255) {
      return `rgb(${r}, ${g}, ${b})`;
    }

    const alpha = Number((a / 255).toFixed(4));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return color;
  }
}

function getResolvedColor(value: string) {
  const element = document.createElement("span");
  element.style.color = value;
  element.style.display = "none";
  document.body.appendChild(element);
  const resolved = getComputedStyle(element).color;
  document.body.removeChild(element);
  return colorToRgbString(resolved);
}

export function resolveChartColor(value: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const resolved = getResolvedColor(value);
    return resolved && isLegacyColorString(resolved) ? resolved : fallback;
  } catch {
    return fallback;
  }
}

export function withAlpha(color: string, alpha: number, fallback: string) {
  const resolved = resolveChartColor(color, fallback);
  const rgbMatch = resolved.match(/\d+(\.\d+)?/g);

  if (!rgbMatch || rgbMatch.length < 3) {
    return fallback;
  }

  const [r, g, b] = rgbMatch;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
