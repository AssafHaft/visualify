# Now-playing bridge for desktop.js, via Windows' media session API (what the volume flyout's media controls use).
# Prints the current session (Spotify first, else whatever Windows considers current) as one JSON line whenever it
# changes, and runs toggle / next / previous commands read from stdin. Exits when stdin closes, i.e. the app quits.
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
  Select-Object -First 1
function Await($operation, [type]$type) { $asTask.MakeGenericMethod($type).Invoke($null, @($operation)).Result }

$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$commands = @{ toggle = 'TryTogglePlayPauseAsync'; next = 'TrySkipNextAsync'; previous = 'TrySkipPreviousAsync' }
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$command = $stdin.ReadLineAsync()
$last = $null

while ($true) {
  $session = @($manager.GetSessions() | Where-Object SourceAppUserModelId -like '*Spotify*')[0]
  if (!$session) { $session = $manager.GetCurrentSession() }
  $state = 'null'
  if ($session) {
    $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $state = @{ title = $info.Title; artist = $info.Artist; playing = $session.GetPlaybackInfo().PlaybackStatus -eq 'Playing' } | ConvertTo-Json -Compress
  }
  if ($state -ne $last) { [Console]::Out.WriteLine($state); $last = $state }

  # ponytail: polls every 500ms; subscribe to the session's change events if that ever feels laggy
  if (!$command.Wait(500)) { continue }
  if ($null -eq $command.Result) { break }
  if ($session -and $commands[$command.Result]) { $null = Await ($session.($commands[$command.Result])()) ([bool]) }
  $command = $stdin.ReadLineAsync()
}
