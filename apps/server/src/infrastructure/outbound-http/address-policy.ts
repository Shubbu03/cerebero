import { lookup } from 'node:dns/promises'

import ipaddr from 'ipaddr.js'

import {
  RestrictedHttpError,
  type AddressFamily,
  type AddressResolver,
  type ResolvedAddress,
} from './outbound-http-types.js'

function removeIpv6Brackets(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1)
  }

  return hostname
}

function parseResolvedAddress(value: ResolvedAddress): ResolvedAddress {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6

  try {
    parsed = ipaddr.parse(value.address)
  } catch {
    throw new RestrictedHttpError('unavailable', true)
  }

  const family: AddressFamily = parsed.kind() === 'ipv4' ? 4 : 6
  if (family !== value.family) {
    throw new RestrictedHttpError('unavailable', true)
  }

  if (parsed.range() !== 'unicast') {
    throw new RestrictedHttpError('blocked_unsafe_url', false)
  }

  return { address: parsed.toString(), family }
}

function parseIpLiteral(hostname: string): ResolvedAddress | null {
  const candidate = removeIpv6Brackets(hostname)
  if (!ipaddr.isValid(candidate)) {
    return null
  }

  const parsed = ipaddr.parse(candidate)
  return parseResolvedAddress({
    address: candidate,
    family: parsed.kind() === 'ipv4' ? 4 : 6,
  })
}

export const systemAddressResolver: AddressResolver = async (hostname) => {
  const addresses = await lookup(hostname, {
    all: true,
    order: 'verbatim',
  })

  return addresses.map(({ address, family }) => {
    if (family !== 4 && family !== 6) {
      throw new Error(
        'The system resolver returned an unsupported address family.',
      )
    }

    return { address, family }
  })
}

export async function resolvePublicAddresses(
  url: URL,
  resolver: AddressResolver,
): Promise<readonly ResolvedAddress[]> {
  const literal = parseIpLiteral(url.hostname)
  if (literal) {
    return [literal]
  }

  let resolved: readonly ResolvedAddress[]
  try {
    resolved = await resolver(url.hostname)
  } catch {
    throw new RestrictedHttpError('unavailable', true)
  }

  if (resolved.length === 0) {
    throw new RestrictedHttpError('unavailable', true)
  }

  const uniqueAddresses = new Map<string, ResolvedAddress>()
  for (const candidate of resolved) {
    const address = parseResolvedAddress(candidate)
    uniqueAddresses.set(`${address.family}:${address.address}`, address)
  }

  return [...uniqueAddresses.values()]
}
