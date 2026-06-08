export const usePublicAssetPath = () => {
  const runtimeConfig = useRuntimeConfig()

  const resolvePublicAssetPath = (path) => {
    const baseUrl = runtimeConfig.app.baseURL || '/'
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath
  }

  return {
    resolvePublicAssetPath
  }
}
