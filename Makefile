start-server:
	node app.js

lint:
	gjslint --recurse . \
		--disable "220,225,0211,0110" \
		--exclude_directories "examples,node_modules,b2g,api-design"

.FORCE: test
tests:
	./node_modules/.bin/mocha
