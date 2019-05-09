import {
  ExtensionContext,
  workspace,
  CompleteOption,
  ISource,
  sources,
  SourceType,
} from 'coc.nvim'

import which from 'which'

import { spawn } from 'child_process'

export async function activate(context: ExtensionContext): Promise<void> {
  const { subscriptions } = context

  try {
    which.sync('notmuch')
  } catch (e) {
    workspace.showMessage('notmuch required for coc-notmuch', 'warning')
    return
  }

  let source: ISource = {
    name: 'notmuch',
    enable: true,
    filetypes: ['mail'],
    priority: 1,
    sourceType: SourceType.Service,
    triggerPatterns: [
      /^(Bcc|Cc|From|Reply-To|To):\s*/,
      /^(Bcc|Cc|From|Reply-To|To):.*,\s*/,
    ],
    doComplete: async function(opt: CompleteOption) {
      if (!opt.input) {
        return
      }

      const { input } = opt
      const matches = await query(input)
      return {
        items: matches.map(m => {
          return {
            word: `${m.result}`,
          }
        }),
      }
    },
  }

  subscriptions.push(sources.addSource(source))
}

function query(input: string): Promise<Match[]> {
  return new Promise((resolve, reject) => {
    const notmuch = spawn('notmuch', ['address', "*"])
    let matches = []
    notmuch.stdout.on('data', data => {
      data
        .toString()
        .split('\n')
        .forEach((m: string) => {
          const result = m.toString()
          matches.push({ result })
        })
    })
    notmuch.on('exit', () => resolve(matches))
    notmuch.on('error', err => reject(err))
  })
}

interface Match {
  result: string
}
