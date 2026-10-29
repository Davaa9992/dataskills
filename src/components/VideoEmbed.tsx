/** YouTube, Vimeo линкийг embed болгоно. Бусад линкийг шууд холбоос болгоно */
function toEmbed(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) {
            const id = u.searchParams.get('v') || u.pathname.split('/').pop()
            return id ? `https://www.youtube.com/embed/${id}` : null
        }
        if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
        if (u.hostname.includes('vimeo.com')) {
            const id = u.pathname.split('/').filter(Boolean).pop()
            return id ? `https://player.vimeo.com/video/${id}` : null
        }
        if (u.hostname.includes('mediadelivery.net') || u.pathname.includes('/embed')) return url
        return null
    } catch {
        return null
    }
}

export default function VideoEmbed({ url, title }: { url: string; title: string }) {
    const embed = toEmbed(url)
    if (!embed) {
        return (
            <a className="btn" href={url} target="_blank" rel="noreferrer">
                ▶ Видео үзэх
            </a>
        )
    }
    return (
        <div className="video">
            <iframe src={embed} title={title} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
    )
}
