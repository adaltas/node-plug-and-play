
plugandplay = require '../src'

describe 'plugandplay.sample', ->

  it 'validate', ->
    data = []
    write = process.stdout.write
    process.stdout.write = (chunk) -> data.push chunk
    require '../sample'
    process.stdout.write = write
    data.join('').trim().should.eql """
    >>>>>>>>>>>
    Hello World
    <<<<<<<<<<<
    """
