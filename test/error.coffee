
import error from '../lib/error.js'

describe 'plugandplay.error', ->
  
  it 'join code with messsage', ->
    err = error 'CATCH_ME', 'catch me'
    err.message.should.eql 'CATCH_ME: catch me'
  
  it 'merge multiple context', ->
    err = error 'CATCH_ME', 'catch me', {a_key: 'a value'}, {b_key : 'b value'}
    err.a_key.should.eql 'a value'
    err.b_key.should.eql 'b value'
    
    