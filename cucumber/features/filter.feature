@javascript
Feature: Filter
  In order to find the word I'm interested in
  As a person who is interest in words
  I want to be able to filter the words

  Scenario: Search for cucumber
    Given I am on the home page
    And I have entered "Bhutan" into the "filter" field
    When I click the ".ui.blue.button" element
    And I wait for 1 seconds
    Then I should see "Displaying 3 of 3"