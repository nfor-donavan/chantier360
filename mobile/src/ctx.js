import { createContext, useContext } from 'react';

export const LIGHT = { dark: false, bg: '#F1F3F6', card: '#FFFFFF', line: '#E3E7EC', ink: '#14213A', mute: '#66728A', soft: '#F7F9FC', header: '#0F1E38',
  yellow: '#F5B800', green: '#1FB36B', red: '#D64545', okbg: '#E3F6EC', okline: '#BFE8D2', warnbg: '#FFF3D6', warnline: '#F3DC9B', badbg: '#FBE5E5', badfg: '#B02A2A',
  input: '#FFFFFF', inputline: '#CBD3DF', step: '#E8ECF2', stepfg: '#0F1E38', dash: '#B9C3D3' };
export const DARK = { dark: true, bg: '#0B1426', card: '#121F38', line: '#243656', ink: '#E8EEF9', mute: '#93A3C0', soft: '#0F1A30', header: '#081020',
  yellow: '#F5B800', green: '#2BC77C', red: '#E25555', okbg: '#10352A', okline: '#1C5A44', warnbg: '#3A3216', warnline: '#5E5121', badbg: '#3A1E24', badfg: '#FF9C9C',
  input: '#0F1A30', inputline: '#31476B', step: '#1D2D4A', stepfg: '#E8EEF9', dash: '#3A4F75' };

// [English, French]
const D = {
  hello: ['Good day,', 'Bonjour,'], signout: ['Sign out', 'Déconnexion'],
  tagline: ['Site foreman app. Log work even without network.', 'Application chef de chantier. Saisissez même sans réseau.'],
  email: ['Email', 'E-mail'], password: ['Password', 'Mot de passe'], signin: ['Sign in', 'Se connecter'],
  connecting: ['Connecting… the server may take up to a minute to wake up.', "Connexion… le serveur peut mettre jusqu'à une minute à se réveiller."],
  openas: ['Open directly as', 'Ouvrir directement en tant que'],
  'err.network': ['No connection to the server. Check your network and try again.', 'Pas de connexion au serveur. Vérifiez votre réseau et réessayez.'],
  'err.hq': ['Head office accounts use the web portal.', 'Les comptes du siège utilisent le portail web.'],
  offline_switch: ['Work offline (demo switch)', 'Mode hors ligne (démo)'],
  'st.syncing': ['Sending to HQ…', 'Envoi au siège…'], 'st.online': ['Connected', 'Connecté'], 'st.offline': ['No network: saving on this phone', 'Pas de réseau : enregistrement sur le téléphone'],
  waiting: ['waiting to send', 'en attente d\'envoi'],
  'tile.att': ['Check in workers', 'Pointer les ouvriers'], 'tile.att.sub': ['Daily headcount and photo', 'Effectif du jour et photo'],
  'tile.del': ['Log a delivery', 'Enregistrer une livraison'], 'tile.del.sub': ['Compare with the order', 'Comparer à la commande'],
  'tile.sync': ['Sync status', 'État de la synchro'], 'tile.sync.sub': ['Pending and sent records', 'Envois en attente et effectués'],
  recent: ['Recently sent to HQ', 'Récemment envoyé au siège'], 'recent.none': ['Nothing sent yet. Your first log will appear here.', 'Rien envoyé pour le moment. Votre première saisie apparaîtra ici.'],
  'flag.short': ['Flagged to HQ: short delivery', 'Signalé au siège : livraison incomplète'],
  'att.title': ['Check in workers', 'Pointer les ouvriers'], 'att.cats': ['Workers present today, by category', "Ouvriers présents aujourd'hui, par catégorie"], 'att.totalp': ['Total present', 'Total présents'], 'att.planned': ['planned', 'prévus'],
  'att.above': ['Above the planned headcount. HQ will review this before approving.', "Au-dessus de l'effectif prévu. Le siège vérifiera avant d'approuver."],
  'att.photo': ['Group photo of the workers on site (required)', 'Photo de groupe des ouvriers sur le chantier (obligatoire)'],
  'att.take': ['Take group photo', 'Prendre la photo de groupe'], 'att.save': ['Save attendance', 'Enregistrer la présence'], 'att.item': ['Attendance', 'Présence'], 'workers': ['workers', 'ouvriers'], 'cats.none': ['Connect once to load the workforce categories.', 'Connectez-vous une fois pour charger les catégories.'],
  'tile.rep': ['Daily report', 'Rapport journalier'], 'tile.rep.sub': ['Work, workforce, stock, difficulties', 'Travaux, effectifs, stock, difficultés'], 'tile.photo': ['Site photo', 'Photo du chantier'], 'tile.photo.sub': ['Add progress evidence', "Ajouter une preuve d'avancement"],
  'rep.title': ['Daily report', 'Rapport journalier'], 'rep.work': ['Work performed today', "Travaux effectués aujourd'hui"], 'rep.addtask': ['Add a task', 'Ajouter une tâche'], 'rep.qty': ['Qty done today', "Qté faite aujourd'hui"],
  'rep.obj': ['Objectives', 'Objectifs'], 'rep.crew': ['Workforce', 'Moyens humains'], 'rep.equip': ['Equipment and materials used', 'Matériels et matériaux utilisés'], 'rep.item': ['Item', 'Article'], 'rep.additem': ['Add an item', 'Ajouter un article'], 'rep.newitem': ['+ New item', '+ Nouvel article'],
  'rep.stock': ['Stock entries and exits', 'Entrées et sorties de stock'], 'rep.addmove': ['Add a movement', 'Ajouter un mouvement'], 'rep.party': ['Supplier or destination', 'Fournisseur ou destination'], 'rep.in': ['Entry', 'Entrée'], 'rep.out': ['Exit', 'Sortie'],
  'rep.diff': ['Difficulties and solutions', 'Difficultés et solutions'], 'rep.issue': ['Difficulty', 'Difficulté'], 'rep.sol': ['Solution', 'Solution'], 'rep.adddiff': ['Add a difficulty', 'Ajouter une difficulté'],
  'rep.tomorrow': ["Tomorrow's programme", 'Programme de demain'], 'rep.orders': ['Orders', 'Commande'], 'rep.cash': ['Site cash', 'Caisse chantier'], 'rep.cash.open': ['Opening balance (FCFA)', 'Solde initial (FCFA)'], 'rep.cash.exp': ['Expenses today (FCFA)', "Dépenses du jour (FCFA)"],
  'rep.photos': ['Photos (up to 3)', "Photos (jusqu'à 3)"], 'rep.addphoto': ['Add photo', 'Ajouter une photo'], 'rep.save': ['Save report', 'Enregistrer le rapport'], 'rep.none.tasks': ['Connect once to load the task list.', 'Connectez-vous une fois pour charger les tâches.'], 'rep.item.report': ['Report', 'Rapport'], 'rep.tasks': ['tasks', 'tâches'],
  'ph.title': ['Site photo', 'Photo du chantier'], 'ph.caption': ['Caption', 'Légende'], 'ph.task': ['Related task (optional)', 'Tâche concernée (facultatif)'], 'ph.save': ['Save photo', 'Enregistrer la photo'], 'ph.item': ['Site photo', 'Photo du chantier'], 'ph.take': ['Take photo', 'Prendre la photo'],
  'del.title': ['Log a delivery', 'Enregistrer une livraison'], 'del.order': ['Open order', 'Commande en cours'], 'del.ordered': ['ordered', 'commandé'],
  'del.none': ['No open orders for your site. Connect once to load them.', "Aucune commande en cours pour votre site. Connectez-vous une fois pour les charger."],
  'del.qty': ['Quantity actually received', 'Quantité réellement reçue'], 'del.short': ['short of the order', 'de moins que la commande'],
  'del.warn': ['HQ is alerted as soon as this syncs. Photograph the delivery note as proof.', "Le siège est alerté dès la synchronisation. Photographiez le bon de livraison comme preuve."],
  'del.photo': ['Photo of the delivery note (required)', 'Photo du bon de livraison (obligatoire)'], 'del.take': ['Photograph delivery note', 'Photographier le bon de livraison'], 'del.save': ['Save delivery', 'Enregistrer la livraison'],
  'del.detail': ['received of', 'reçus sur'], 'photo.ok': ['✓ Photo captured', '✓ Photo prise'],
  'sync.title': ['Sync status', 'État de la synchro'], 'sync.ok': ['Everything is up to date', 'Tout est à jour'], 'sync.sending': ['Sending records to HQ…', 'Envoi des données au siège…'], 'sync.wait': ['Waiting for network', 'En attente de réseau'],
  'sync.note': ['Records are kept safely on this phone and sent automatically when a signal returns.', "Les données sont gardées sur ce téléphone et envoyées automatiquement dès le retour du réseau."],
  'sync.pending': ['Waiting to send', "En attente d'envoi"], 'sync.sent': ['Sent', 'Envoyés'], 'sync.none': ['No records are waiting.', 'Aucune donnée en attente.'], 'sync.now': ['Sync now', 'Synchroniser maintenant'],
  'sync.failed': ['Rejected by the server', 'Refusé par le serveur'], remove: ['Remove', 'Supprimer'],
  'saved.title': ['Saved on this phone', 'Enregistré sur ce téléphone'], 'saved.online': ['Sending to HQ now.', 'Envoi au siège en cours.'], 'saved.offline': ['No network. It will be sent automatically when you are back online.', "Pas de réseau. L'envoi se fera automatiquement au retour de la connexion."],
  'cam.denied': ['Camera access is needed to take the photo. Allow it in your phone settings.', "L'accès à la caméra est nécessaire. Autorisez-le dans les réglages du téléphone."],
  'cam.error': ['Could not open the camera', "Impossible d'ouvrir la caméra"],
  'hint.photo': ['Take the group photo to enable saving.', 'Prenez la photo de groupe pour activer l\'enregistrement.'],
  'hint.delivery': ['Enter the quantity received and take the delivery-note photo to enable saving.', 'Saisissez la quantité reçue et prenez la photo du bon de livraison pour activer l\'enregistrement.'],
  light: ['Light', 'Clair'], dark: ['Dark', 'Sombre'],
};
export const makeT = (lang) => (k) => (D[k] ? D[k][lang === 'fr' ? 1 : 0] : k);

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
export const fmt = (n) => `${new Intl.NumberFormat('fr-FR').format(n || 0)} FCFA`;
export const demoForemen = [
  { email: 'foreman@mac-construction.cm', password: 'demo1234', name: 'Fon Emmanuel', site: 'Bastos Residential Complex · Yaoundé' },
  { email: 'carine@mac-construction.cm', password: 'demo1234', name: 'Essomba Carine', site: 'Kribi Port Warehouse · Kribi' },
];
