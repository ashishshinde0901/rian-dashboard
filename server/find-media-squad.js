import axios from 'axios';

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const WORKSPACE_GID = '1200057218350324';

const api = axios.create({
  baseURL: 'https://app.asana.com/api/1.0',
  headers: { Authorization: `Bearer ${ASANA_ACCESS_TOKEN}` },
});

async function findMediaSquad() {
  console.log('\n🔍 Searching for Media Squad project...\n');

  const { data } = await api.get('/projects', {
    params: {
      workspace: WORKSPACE_GID,
      opt_fields: 'name,gid',
      limit: 100,
    },
  });

  console.log('📁 All projects in workspace:\n');
  data.data.forEach((project, idx) => {
    console.log(`${idx + 1}. ${project.name} (${project.gid})`);
  });

  const mediaSquad = data.data.find(p =>
    p.name.toLowerCase().includes('media') && p.name.toLowerCase().includes('squad')
  );

  if (mediaSquad) {
    console.log(`\n✅ Found Media Squad: ${mediaSquad.name} (${mediaSquad.gid})`);
  } else {
    console.log('\n❌ Media Squad project not found. Check the name above.');
  }
}

findMediaSquad().catch(console.error);
