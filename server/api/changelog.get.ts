import MarkdownIt from 'markdown-it-ts'
import sanitizeHtml from 'sanitize-html'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})

const sanitizeOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'a',
    'blockquote',
    'strong',
    'em'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer'
    })
  }
}

export default defineEventHandler(async () => {
  const changelogPath = join(process.cwd(), 'CHANGELOG.md')
  const changelogMarkdown = await readFile(changelogPath, 'utf8')
  const renderedChangelog = markdown.render(changelogMarkdown)
  const sanitizedChangelog = sanitizeHtml(renderedChangelog, sanitizeOptions)

  return {
    html: sanitizedChangelog
  }
})
