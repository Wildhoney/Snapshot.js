Given /^I am on the home page$/ do
  visit('/')
end

Given /^I have entered "([^"]*)" into the "([^"]*)" field$/ do |text, field|
  fill_in field, :with => text
end

When /^I click the "([^"]*)" button$/ do |selector|
  find(selector).click
end

Then /^I should see "([^"]*)"$/ do |text|
  page.should have_content(text)
end

Given /^I wait for (\d+) seconds?$/ do |n|
  sleep(n.to_i)
end