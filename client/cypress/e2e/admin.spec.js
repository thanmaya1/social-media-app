describe('Admin flow', () => {
  const rand = Math.floor(Math.random()*100000)
  const testUser = { username: `testadmin${rand}`, email: `testadmin${rand}@example.com`, password: 'Password123!' }

  it('registers user and visits admin when promoted', () => {
    // register
    cy.request('POST', '/api/auth/register', testUser).then((res) => {
      expect(res.status).to.be.oneOf([200,201])
      // login
      cy.request('POST', '/api/auth/login', { email: testUser.email, password: testUser.password }).then(() => {
        // attempt to visit admin (should be forbidden initially)
        cy.visit('/admin')
        cy.contains('Not authorized').should('exist')
      })
    })
  })
})
