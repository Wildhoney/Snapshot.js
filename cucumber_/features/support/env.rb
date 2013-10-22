begin require 'rspec/expectations'; rescue LoadError; require 'spec/expectations'; end
require 'capybara' 
require 'capybara/dsl' 
require 'capybara/cucumber'
require 'capybara-webkit'
Capybara.default_driver = :webkit
Capybara.app_host = 'http://www.google.com' 
World(Capybara) 
