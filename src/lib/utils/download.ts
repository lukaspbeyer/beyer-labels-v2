/** Übergibt eine im Browser erzeugte Datei an den Download. */
export function saveFile(body: Uint8Array | string, fileName: string, mime: string): void {
	const part = typeof body === 'string' ? body : body.slice().buffer;
	const url = URL.createObjectURL(new Blob([part], { type: mime }));
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
