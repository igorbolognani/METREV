function triggerDownload(input: {
  content: string;
  fileName: string;
  contentType: string;
}): void {
  const blob = new Blob([input.content], { type: input.contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = input.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function downloadJson(input: {
  value: unknown;
  fileName: string;
}): void {
  triggerDownload({
    content: JSON.stringify(input.value, null, 2),
    fileName: input.fileName,
    contentType: 'application/json',
  });
}

export function downloadCsv(input: {
  content: string;
  fileName: string;
}): void {
  triggerDownload({
    content: input.content,
    fileName: input.fileName,
    contentType: 'text/csv',
  });
}
