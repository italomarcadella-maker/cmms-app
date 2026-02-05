const bcrypt = require('bcryptjs');

async function generate() {
    console.log('admin:', await bcrypt.hash('admin', 10));
    console.log('user:', await bcrypt.hash('user', 10));
}

generate();
