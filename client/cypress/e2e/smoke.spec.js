describe('App smoke', () => {
  it('loads the homepage', () => {
    cy.visit('/')
    cy.contains('Home')
  })
})
