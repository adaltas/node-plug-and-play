
import { execFile as _execFile } from 'child_process'
import util from 'util'
execFile = util.promisify(_execFile)

describe 'plugandplay.sample', ->

  it 'validate', ->
    { stdout } = await execFile('node', ['./sample'])
    stdout.trim().should.eql """
    >>>>>>>>>>>
    Hello World
    <<<<<<<<<<<
    """
