const { withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

// Why: CocoaPods leaves each pod's resource-bundle target on the deployment
// target its own podspec declares — 9.0 for SDWebImage, 12.4 for RNSVGFilters,
// 13.4 for RNCAsyncStorage_resources — regardless of the Podfile's platform
// line. Xcode 26+ refuses anything under 15.0 and fails the build before it
// compiles, so the floor has to be reapplied after pod install. Raising it is
// safe: the app's own minimum is already higher than every pod's.
// Keep in sync with expo-build-properties `ios.deploymentTarget` in app.json.
const DEPLOYMENT_TARGET_FLOOR = '16.0'

const POST_INSTALL_ANCHOR = '  post_install do |installer|\n'
const DEPLOYMENT_TARGET_FLOOR_RUBY = `    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |pod_config|
        existing = pod_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if existing.nil? || existing.to_f < ${DEPLOYMENT_TARGET_FLOOR}
          pod_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET_FLOOR}'
        end
      end
    end
`

module.exports = function withIosPodDeploymentTargetFloor(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')
      const podfile = fs.readFileSync(podfilePath, 'utf8')
      if (podfile.includes('IPHONEOS_DEPLOYMENT_TARGET')) {
        return cfg
      }
      if (!podfile.includes(POST_INSTALL_ANCHOR)) {
        throw new Error(
          'Podfile has no `post_install do |installer|` block to raise the pod deployment-target floor in'
        )
      }
      fs.writeFileSync(
        podfilePath,
        podfile.replace(POST_INSTALL_ANCHOR, POST_INSTALL_ANCHOR + DEPLOYMENT_TARGET_FLOOR_RUBY)
      )
      return cfg
    }
  ])
}
