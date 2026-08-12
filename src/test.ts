import fs from "fs";
export async function getExampleMarkdown(filepath: string) {
    const formData = new FormData();
    const fileStream = fs.readFileSync(filepath);
    const blob = new Blob([fileStream], { type: "image/jpeg" });
    formData.append("file", blob);
    formData.append("model", "AksonOCR-preview");
    formData.append("tokenConfidence", "true");

    const response = await fetch(
        "https://backend.aksonocr.com/api/v2/upload",
        {
            method: "POST",
            headers: { "X-API-Key": "ak_ae214147da4b4cd38f586b71734c83f2" },
            body: formData
        }
    );
    const data = await response.json();
    console.log(data)
    return data.pages[0].markdown
}
