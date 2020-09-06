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
    },

    handleSquirrelEvent: function() {
      if (process.argv.length === 1) {
        return false
      }

      const ChildProcess = require('child_process')
      const path = require('path')

      const appFolder = path.resolve(process.execPath, '..')
      const rootAtomFolder = path.resolve(appFolder, '..')
      const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'))
      const exeName = path.basename(process.execPath)

      const spawn = function(command, args) {
        let spawnedProcess

        try {
          spawnedProcess = ChildProcess.spawn(command, args, { detached: true })
        } catch (error) {
          console.warn(error)
        }

        return spawnedProcess
      }

      const spawnUpdate = function(args) {
        return spawn(updateDotExe, args)
      }

      const squirrelEvent = process.argv[1]
      switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
          // Optionally do things such as:
          // - Add your .exe to the PATH
          // - Write to the registry for things like file associations and
          //   explorer context menus

          // Install desktop and start menu shortcuts
          spawnUpdate(['--createShortcut', exeName])

          setTimeout(app.quit, 1000)
          break

        case '--squirrel-uninstall':
          // Undo anything you did in the --squirrel-install and
          // --squirrel-updated handlers

          // Remove desktop and start menu shortcuts
          spawnUpdate(['--removeShortcut', exeName])

          setTimeout(app.quit, 1000)
          break

        case '--squirrel-obsolete':
          // This is called on the outgoing version of your app before
          // we update to the new version - it's the opposite of
          // --squirrel-updated

          app.quit()
          break
      }
    }
};