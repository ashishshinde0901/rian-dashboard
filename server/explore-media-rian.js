// Exploration script to understand Media.Rian project structure
import axios from 'axios';

const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN || '<your-asana-personal-access-token>';
const WORKSPACE_GID = '1200057218350324';

const api = axios.create({
  baseURL: 'https://app.asana.com/api/1.0',
  headers: { Authorization: `Bearer ${ASANA_ACCESS_TOKEN}` },
});

async function explore() {
  console.log('\n=== EXPLORING MEDIA.RIAN PROJECT ===\n');

  try {
    // 1. Find Media.Rian project
    console.log('1. Finding Media.Rian project...');
    const { data: projectsData } = await api.get('/projects', {
      params: {
        workspace: WORKSPACE_GID,
        opt_fields: 'name,gid',
        limit: 100
      }
    });

    const mediaRianProject = projectsData.data.find(p =>
      p.name.toLowerCase().includes('media') && p.name.toLowerCase().includes('rian')
    );

    if (!mediaRianProject) {
      console.log('❌ Could not find Media.Rian project');
      console.log('Available projects:', projectsData.data.map(p => p.name).join(', '));
      return;
    }

    console.log(`✓ Found project: "${mediaRianProject.name}" (${mediaRianProject.gid})\n`);

    // 2. Get custom fields for workspace
    console.log('2. Fetching custom fields...');
    const { data: fieldsData } = await api.get(`/workspaces/${WORKSPACE_GID}/custom_fields`, {
      params: {
        opt_fields: 'gid,name,resource_subtype,enum_options.gid,enum_options.name,enum_options.enabled',
        limit: 100
      }
    });

    console.log(`✓ Found ${fieldsData.data.length} custom fields\n`);

    console.log('=== CUSTOM FIELDS ===');
    fieldsData.data.forEach((field, idx) => {
      console.log(`\n${idx + 1}. ${field.name}`);
      console.log(`   Type: ${field.resource_subtype}`);
      console.log(`   GID: ${field.gid}`);

      if (field.enum_options && field.enum_options.length > 0) {
        console.log(`   Options:`);
        field.enum_options.forEach(opt => {
          console.log(`     - ${opt.name} (${opt.gid})${opt.enabled === false ? ' [DISABLED]' : ''}`);
        });
      }
    });

    // 3. Get sample tasks from the project
    console.log('\n\n3. Fetching sample tasks from Media.Rian...');
    const { data: tasksData } = await api.get(`/projects/${mediaRianProject.gid}/tasks`, {
      params: {
        opt_fields: 'name,gid,custom_fields.name,custom_fields.enum_value.name,custom_fields.multi_enum_values.name,custom_fields.text_value,custom_fields.number_value,custom_fields.date_value',
        limit: 5
      }
    });

    console.log(`✓ Found ${tasksData.data.length} sample tasks\n`);

    console.log('=== SAMPLE TASKS ===');
    tasksData.data.forEach((task, idx) => {
      console.log(`\n${idx + 1}. ${task.name} (${task.gid})`);
      if (task.custom_fields && task.custom_fields.length > 0) {
        console.log('   Custom Fields:');
        task.custom_fields.forEach(cf => {
          let value = 'empty';
          if (cf.enum_value) value = cf.enum_value.name;
          else if (cf.multi_enum_values && cf.multi_enum_values.length > 0) {
            value = cf.multi_enum_values.map(v => v.name).join(', ');
          } else if (cf.text_value) value = cf.text_value;
          else if (cf.number_value !== null && cf.number_value !== undefined) value = cf.number_value;
          else if (cf.date_value) value = cf.date_value;

          console.log(`     - ${cf.name}: ${value}`);
        });
      }
    });

    // 4. Summary mapping
    console.log('\n\n=== RECOMMENDED FIELD MAPPING ===');
    console.log('Based on the design requirements, map these Asana fields:');
    console.log('\nDesign Field → Asana Field');
    console.log('─'.repeat(50));

    const fieldMap = {
      'Initiative Type (tab)': 'Look for a field with options like "International BD", "India BD", "Media Sales & Delivery", "Technology & Product"',
      'Flag (health)': 'Look for a field with red/amber/green or blocked/at-risk/on-track',
      'Delivery Status': 'Task status field (On Time, Delayed, etc.)',
      'Priority': 'P0/P1/P2/P3 field',
      'Region': 'MENA, SEA, India, Europe, etc.',
      'Client': 'Client name field',
      'Conversion Time': 'Timeline estimation (3/6/12 months)',
      'Expected Value': 'Deal value in Lakhs (₹L)',
      'Committed Date': 'Delivery date field',
    };

    Object.entries(fieldMap).forEach(([design, asana]) => {
      console.log(`${design.padEnd(25)} → ${asana}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('Project GID:', mediaRianProject.gid);
    console.log('Workspace GID:', WORKSPACE_GID);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

explore();
