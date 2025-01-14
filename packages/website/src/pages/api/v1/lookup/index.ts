/*
 * Copyright (c) Cynthia Rey et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type { APIContext } from 'astro'
import { transformSetsToIdentifier } from '@pronoundb/pronouns/legacy'

import { ApiCallVersionCounter } from '@server/metrics.js'
import { lookupPronouns } from '@server/database/users.js'
import { collectMetrics } from '../../v2/lookup.js'

const providers = [
	'discord',
	'github',
	'minecraft',
	'twitch',
	'twitter',
]

export async function GET (ctx: APIContext) {
	ApiCallVersionCounter.inc({ version: 1 })

	const platform = ctx.url.searchParams.get('platform')
	const id = ctx.url.searchParams.get('id')

	if (!platform || !id) {
		return new Response(
			JSON.stringify({
				errorCode: 400,
				error: 'Bad request',
				message: '`platform` and `id` query parameters are required.',
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		)
	}

	if (!providers.includes(platform)) {
		return new Response(
			JSON.stringify({
				errorCode: 400,
				error: 'Bad request',
				message: '`platform` is not a valid platform.',
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		)
	}

	const users = await lookupPronouns(platform, [ id ])
	collectMetrics(platform, 1, users.length)

	if (users.length === 0) {
		return new Response('{"pronouns":"unspecified"}', {
			headers: {
				'Cache-Control': 'public, max-age=30',
				'Access-Control-Allow-Methods': 'GET',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'X-PronounDB-Source',
				'Access-Control-Max-Age': '7200',
				'Content-Type': 'application/json',
			},
		})
	}

	const body = JSON.stringify({ pronouns: transformSetsToIdentifier(users[0]?.pronouns.en) })
	return new Response(body, {
		headers: {
			'Cache-Control': 'public, max-age=300',
			'Access-Control-Allow-Methods': 'GET',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'X-PronounDB-Source',
			'Access-Control-Max-Age': '7200',
			'Content-Type': 'application/json',
		},
	})
}

export function OPTIONS () {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Methods': 'GET',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'X-PronounDB-Source',
			'Access-Control-Max-Age': '7200',
		},
	})
}

export function ALL () {
	return new Response(JSON.stringify({ statusCode: 405, error: 'Method not allowed' }), { status: 405 })
}
