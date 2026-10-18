import test from 'node:test'
import assert from 'node:assert/strict'
import { blockedProbePath } from '../src/lib/request-screening'

test('probe screening rejects encoded secrets and obsolete executables, not legitimate pages/assets', () => {
  for (const path of ['/.env','/.env.production','/%2egit/config','/.svn/entries','/wp-login.php','/xmlrpc.php','/wp-admin/','/PHPMyAdmin/index.php','/foo/test.asp','/%zz']) assert.equal(blockedProbePath(path),true,path)
  for (const path of ['/','/admin','/admin/login','/api/users/login','/targove/kola','/blog','/wp-content/uploads/2022/05/car.webp','/sitemap.xml','/robots.txt','/.well-known/acme-challenge/token','/_next/static/chunks/test.js','/blog/koli-ot-amerika']) assert.equal(blockedProbePath(path),false,path)
})
