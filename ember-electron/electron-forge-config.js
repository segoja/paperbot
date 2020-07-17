const path = require('path');

module.exports = {
    make_targets: {
        win32: ['squirrel'],
        darwin: ['zip', 'dmg'],
        linux: ['deb']
    },
    electronPackagerConfig: {
        appCategoryType: 'public.app-category.productivity',
        appCopyright: 'Copyright (c) 2019-2020 Papercat Creations',
        name: 'Paperbot',
        versionString: {
            CompanyName: 'Papercat Creations',
            FileDescription: 'Paperbot',
            ProductName: 'Paperbot',
            InternalName: 'Paperbot'
        },
        protocols: [
            {
                name: 'Paperbot',
                schemes: ['paperbot']
            }
        ],
        protocol: ['paperbot'],
        protocolName: 'Paperbot',
        overwrite: true,
        icon: 'public/paperbot'
    },
    electronWinstallerConfig: {
        name: 'Paperbot',
        icon: 'public/paperbot',
        authors: 'Papercat Creations',
        exe: 'Paperbot.exe',
        setupIcon: 'K:/work/ember/paperbot/public/paperbot.ico',
        title: 'Paperbot',
        noMsi: true,
    }
};