
import {plugandplay} from '../lib/index.js'

describe 'plugandplay.registered', ->
  
  it 'not registered return false', ->
    plugandplay()
    .registered('module/unregistered')
    .should.be.false()
      
  it 'not registered with parents return false', ->
    plugandplay({
      parent: plugandplay({
        parent: plugandplay()
      })
    })
    .registered('module/unregistered')
    .should.be.false()
      
  it 'registered return true', ->
    plugandplay({
      plugins: [{
        name: 'module/registered'
      }]
    })
    .registered('module/registered')
    .should.be.true()
      
  it 'not registered with parents return false', ->
    plugandplay({
      parent: plugandplay({
        parent: plugandplay({
          plugins: [{
            name: 'module/registered'
          }]
        })
      })
    })
    .registered('module/registered')
    .should.be.true()
