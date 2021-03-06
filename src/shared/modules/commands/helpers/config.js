/*
 * Copyright (c) 2002-2017 "Neo Technology,"
 * Network Engine for Objects in Lund AB [http://neotechnology.com]
 *
 * This file is part of Neo4j.
 *
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { getSettings, update, replace } from 'shared/modules/settings/settingsDuck'
import { extractCommandParameters, splitStringOnFirst } from 'services/commandUtils'
import { getRemoteContentHostnameWhitelist } from 'shared/modules/dbMeta/dbMetaDuck'
import { hostIsAllowed } from 'services/utils'
import { getJSON } from 'services/remote'
import { isValidURL } from 'shared/modules/commands/helpers/http'

export function handleGetConfigCommand (action, cmdchar, store) {
  const settingsState = getSettings(store.getState())
  const res = JSON.stringify(settingsState, null, 2)
  return { result: res, type: 'pre' }
}

export function handleUpdateConfigCommand (action, cmdchar, put, store) {
  const strippedCmd = action.cmd.substr(cmdchar.length)
  const parts = splitStringOnFirst(strippedCmd, ' ')
  const p = new Promise((resolve, reject) => {
    if (parts[1] === undefined || parts[1] === '') return resolve(true) // Nothing to do
    if (!isValidURL(parts[1].trim())) { // Not an URL. Parse as command line params
      const params = extractCommandParameters(`config`, strippedCmd)
      if (!params) return reject(new Error('Could not parse input. Usage: `:config x: 2`.'))
      put(update(params))
      return resolve(params)
    }
    // It's an URL
    const url = parts[1].trim()
    const whitelist = getRemoteContentHostnameWhitelist(store.getState())
    if (!hostIsAllowed(url, whitelist)) { // Make sure we're allowed to request entities on this host
      return reject(new Error('Hostname is not allowed according to server whitelist'))
    }
    getJSON(url)
      .then((res) => {
        put(replace(res))
        resolve(res)
      })
      .catch((e) => {
        reject(new Error(e))
      })
  })
  return p
}
