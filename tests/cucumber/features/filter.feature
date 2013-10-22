@javascript
Feature: Filter
  In order to find the word I'm interested in
  As a person who is interest in words
  I want to be able to filter the words

  Scenario: Search for Bhutan
    Given I am on the home page
    And I have entered "Bhutan" into the "filter" field
    When I click the ".ui.blue.button" button
    And I wait for 1 seconds
    Then I should see "Displaying 3 of 3"

  Scenario: Clear filter
    Given I am on the home page
    And I have entered "w" into the "filter" field
    When I click the ".ui.blue.button" button
    And I wait for 2 seconds
    And I click the ".ui.grey.button" button
    Then I should see "Displaying 10 of 100,000"

  Scenario: Reverse sort direction
    Given I am on the home page
    When I click the ".sort-by-word" button
    And I wait for 1 seconds
    Then I should see "émigrés"

#  Scenario: Pagination
#    Given I am on the home page
#    When I click the ".next-page" button
#    And I wait for 1 seconds
#    Then I should see "Page 2 of 1,000"