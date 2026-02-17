export async function analyzeReport(files) {
  const formData = new FormData()

  // ✅ VERY IMPORTANT — plural "files"
  files.forEach(file => {
    formData.append("files", file)
  })

  const response = await fetch("https://api.codoncareai.com/analyze-report", {
    method: "POST",
    body: formData
  })

  if (!response.ok) {
    throw new Error("Server error")
  }

  return await response.json()
}
