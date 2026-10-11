'use client'

import { Link, useConfig, useFormFields } from '@payloadcms/ui'

export function ContentBackLink() {
  const { config } = useConfig()
  const kind = useFormFields(([fields]) => fields.kind?.value)
  const article = kind === 'article'
  return <Link className="content-back-link" href={`${config.routes.admin}/${article ? 'blog-posts' : 'site-pages'}`}>
    ← {article ? 'Към блога' : 'Към страниците'}
  </Link>
}
